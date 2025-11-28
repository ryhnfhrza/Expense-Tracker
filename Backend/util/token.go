package util

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

func getSigningKey() ([]byte, error) {
	signingKey := os.Getenv("SIGNING_KEY")
	if signingKey == "" {
		return nil, fmt.Errorf("SIGNING_KEY empty")
	}
	return []byte(signingKey), nil
}

type MyCustomClaims struct {
	UserId   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func CreateToken(user *domain.User) (string, error) {
	mySigningKey, err := getSigningKey()
	helper.PanicIfError(err)
	if len(mySigningKey) == 0 {
		return "", fmt.Errorf("signing key is empty")
	}

	claims := MyCustomClaims{
		UserId:   user.Id,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString(mySigningKey)
	return ss, err
}

func ValidateToken(tokenString string) (*MyCustomClaims, error) {
	mySigningKey, err := getSigningKey()
	if err != nil {
		return nil, err
	}

	parser := jwt.NewParser(jwt.WithLeeway(5 * time.Second))

	token, err := parser.ParseWithClaims(tokenString, &MyCustomClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return mySigningKey, nil
	})
	if err != nil {
		return nil, err
	}
	if token == nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*MyCustomClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims type")
	}

	return claims, nil
}
