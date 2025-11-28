package repository

import (
	"context"
	"database/sql"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type ExpenseRepository interface {
	CreateExpense(ctx context.Context, tx *sql.Tx, expense *domain.Expense) error
	UpdateExpense(ctx context.Context, tx *sql.Tx, expense *domain.Expense) (*domain.Expense, error)
	DeleteExpanse(ctx context.Context, tx *sql.Tx, expenseId, userId int) error
	FindExpanseById(ctx context.Context, tx *sql.Tx, expenseId, userId int) (*domain.Expense, error)
	FindAllExpanse(ctx context.Context, tx *sql.Tx, userId int, filter domain.ExpenseFilter) ([]domain.Expense, error)
}
