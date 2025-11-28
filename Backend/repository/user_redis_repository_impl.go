package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type userRedisImpl struct {
	Client *redis.Client
}

func NewUserRedisRepository(redisClient *redis.Client) UserRedisRepository {
	return &userRedisImpl{
		Client: redisClient,
	}
}

func (userRedisRepository *userRedisImpl) SaveTempUser(ctx context.Context, key string, ttl time.Duration, user domain.TempUser) error {
	formattedKey := fmt.Sprintf("Register:%s", key)

	data, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user data: %v", err)
	}

	if err := userRedisRepository.Client.Set(ctx, formattedKey, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to save user to redis: %v", err)
	}

	return nil
}

func (userRedisRepository *userRedisImpl) GetTempUser(ctx context.Context, key string) (*domain.TempUser, error) {
	formattedKey := fmt.Sprintf("Register:%s", key)
	val, err := userRedisRepository.Client.Get(ctx, formattedKey).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("data not found or expired")
		}
		return nil, fmt.Errorf("failed to get user from redis: %v", err)
	}

	var user domain.TempUser
	if err := json.Unmarshal([]byte(val), &user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %v", err)
	}

	return &user, nil
}

func (userRedisRepository *userRedisImpl) DeleteTempUser(ctx context.Context, key string) error {
	formattedKey := fmt.Sprintf("Register:%s", key)
	if err := userRedisRepository.Client.Del(ctx, formattedKey).Err(); err != nil {
		return fmt.Errorf("failed to delete temp user: %v", err)
	}
	return nil
}

func (userRedisRepository *userRedisImpl) IncrementAttempt(ctx context.Context, email string, ttl time.Duration) error {
	key := fmt.Sprintf("verify:attempts:%s", email)

	err := userRedisRepository.Client.Incr(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to increment verification attempts: %v", err)
	}

	if err := userRedisRepository.Client.Expire(ctx, key, ttl).Err(); err != nil {
		return fmt.Errorf("failed to set expiry: %v", err)
	}
	return nil
}

func (userRedisRepository *userRedisImpl) GetAttempts(ctx context.Context, email string) (int, error) {
	key := fmt.Sprintf("verify:attempts:%s", email)
	val, err := userRedisRepository.Client.Get(ctx, key).Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get verification attempts: %v", err)
	}

	var attempts int
	fmt.Sscanf(val, "%d", &attempts)
	return attempts, nil
}
