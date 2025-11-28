package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type expenseRepositoryImpl struct{}

func NewExpenseRepository() ExpenseRepository {
	return &expenseRepositoryImpl{}
}

func (repository *expenseRepositoryImpl) CreateExpense(ctx context.Context, tx *sql.Tx, expense *domain.Expense) error {
	query := "insert into expenses(category_id,description,amount,created_at,user_id) values(?,?,?,?,?)"
	result, err := tx.ExecContext(ctx, query, expense.CategoryId, expense.Description, expense.Amount, expense.CreatedAt, expense.UserId)
	if err != nil {
		return fmt.Errorf("failed to insert expense (expenseId=%d, userId=%d): %w", expense.Id, expense.UserId, err)
	}

	idExpense, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id (expenseId=%d, userId=%d): %w", expense.Id, expense.UserId, err)
	}

	expense.Id = int(idExpense)

	return nil
}
func (repository *expenseRepositoryImpl) UpdateExpense(ctx context.Context, tx *sql.Tx, expense *domain.Expense) (*domain.Expense, error) {
	query := "update expenses set description = ?, amount = ?,created_at = ?,category_id =? where id =? and user_id = ?"
	result, err := tx.ExecContext(ctx, query, expense.Description, expense.Amount, expense.CreatedAt, expense.CategoryId, expense.Id, expense.UserId)
	if err != nil {
		return nil, fmt.Errorf("failed to update expense (id=%d, userId=%d): %w", expense.Id, expense.UserId, err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return nil, fmt.Errorf("no expense updated (id=%d, userId=%d)", expense.Id, expense.UserId)
	}

	return expense, nil
}
func (repository *expenseRepositoryImpl) DeleteExpanse(ctx context.Context, tx *sql.Tx, expenseId, userId int) error {
	query := "delete from expenses where id = ? and user_id =?"
	_, err := tx.ExecContext(ctx, query, expenseId, userId)
	if err != nil {
		return fmt.Errorf("failed to delete expense (id=%d, userId=%d): %w", expenseId, userId, err)
	}

	return nil
}
func (repository *expenseRepositoryImpl) FindExpanseById(ctx context.Context, tx *sql.Tx, expenseId, userId int) (*domain.Expense, error) {
	query := "select id,category_id,description,amount,created_at from expenses where id = ? and user_id = ?"
	row := tx.QueryRowContext(ctx, query, expenseId, userId)

	expense := domain.Expense{}

	err := row.Scan(
		&expense.Id,
		&expense.CategoryId,
		&expense.Description,
		&expense.Amount,
		&expense.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("expense not found (id=%d, userId=%d): %w", expenseId, userId, err)
		}
		return nil, fmt.Errorf("failed to scan expense (id=%d, userId=%d): %w", expenseId, userId, err)
	}

	return &expense, nil
}

func (repository *expenseRepositoryImpl) FindAllExpanse(ctx context.Context, tx *sql.Tx, userId int, filter domain.ExpenseFilter) ([]domain.Expense, error) {
	var (
		sb   strings.Builder
		args []interface{}
	)

	sb.WriteString(`
        SELECT
            id,
            category_id,
            description,
            amount,
            created_at
        FROM expenses
        WHERE user_id = ?
    `)
	args = append(args, userId)

	if filter.CategoryId != nil {
		sb.WriteString(" AND category_id = ?")
		args = append(args, *filter.CategoryId)
	}

	if filter.MinAmount != nil {
		sb.WriteString(" AND amount >= ?")
		args = append(args, *filter.MinAmount)
	}

	if filter.MaxAmount != nil {
		sb.WriteString(" AND amount <= ?")
		args = append(args, *filter.MaxAmount)
	}

	if filter.CreatedBefore != nil {
		sb.WriteString(" AND created_at < ?")
		args = append(args, filter.CreatedBefore.UTC().Format("2006-01-02 15:04:05"))
	}

	if filter.CreatedAfter != nil {
		sb.WriteString(" AND created_at > ?")
		args = append(args, filter.CreatedAfter.UTC().Format("2006-01-02 15:04:05"))
	}
	if filter.Description != nil {
        sb.WriteString(" AND description LIKE ?")
        args = append(args, "%"+*filter.Description+"%")
    }
	if filter.SortBy != "" {
		dir := strings.ToUpper(filter.Order)
		if dir != "ASC" && dir != "DESC" {
			dir = "ASC"
		}
		sb.WriteString(fmt.Sprintf(" ORDER BY %s %s", filter.SortBy, dir))
	}

	if filter.Limit > 0 {
		sb.WriteString(" LIMIT ?")
		args = append(args, filter.Limit)
		if filter.Offset > 0 {
			sb.WriteString(" OFFSET ?")
			args = append(args, filter.Offset)
		}
	}

	rows, err := tx.QueryContext(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query expenses for userId=%d: %w", userId, err)
	}
	defer rows.Close()

	var expenses []domain.Expense
	for rows.Next() {
		var expense domain.Expense
		err := rows.Scan(
			&expense.Id,
			&expense.CategoryId,
			&expense.Description,
			&expense.Amount,
			&expense.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan expense row for userId=%d: %w", userId, err)
		}
		expenses = append(expenses, expense)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error for userId=%d: %w", userId, err)
	}

	return expenses, nil
}
