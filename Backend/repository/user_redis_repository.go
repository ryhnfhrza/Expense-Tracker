package repository

import (
	"context"
	"time"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type UserRedisRepository interface {
	SaveTempUser(ctx context.Context, key string, ttl time.Duration, tempUser domain.TempUser) error
	GetTempUser(ctx context.Context, key string) (*domain.TempUser, error)
	DeleteTempUser(ctx context.Context, key string) error
	IncrementAttempt(ctx context.Context, email string, ttl time.Duration) error
	GetAttempts(ctx context.Context, email string) (int, error)
}
