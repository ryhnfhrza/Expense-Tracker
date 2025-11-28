package repository

import (
	"context"
	"database/sql"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type CategoryRepository interface {
	SaveCategory(ctx context.Context, tx *sql.Tx, category *domain.Category) error
	DeleteCategory(ctx context.Context, tx *sql.Tx, categoryId, userId int) error
	FindCategoryById(ctx context.Context, tx *sql.Tx, categoryId, userId int) (*domain.Category, error)
	FindAllCategory(ctx context.Context, tx *sql.Tx, userId int) ([]domain.Category, error)
}
