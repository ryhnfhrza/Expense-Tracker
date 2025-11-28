package repository

import (
	"context"
	"database/sql"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type UserRepository interface {
	SaveToDb(ctx context.Context, tx *sql.Tx, user *domain.User) error
	FindByUsername(ctx context.Context, tx *sql.Tx, username string) (*domain.User, error)
	FindByEmail(ctx context.Context, tx *sql.Tx, email string) (*domain.User, error)
}
