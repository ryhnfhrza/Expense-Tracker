package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type CategoryRepositoryImpl struct{}

func NewCategoryRepository() CategoryRepository {
	return &CategoryRepositoryImpl{}
}

func (categoryRepository *CategoryRepositoryImpl) SaveCategory(ctx context.Context, tx *sql.Tx, category *domain.Category) error {
	query := "insert into categories(name,user_id) values(?,?)"
	result, err := tx.ExecContext(ctx, query, category.Name, category.UserId)
	if err != nil {
		return fmt.Errorf("failed to insert category (name=%s, userId=%d): %w", category.Name, category.UserId, err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get last insert id for category (name=%s, userId=%d): %w", category.Name, category.UserId, err)
	}

	category.Id = int(id)

	return nil
}

func (categoryRepository *CategoryRepositoryImpl) DeleteCategory(ctx context.Context, tx *sql.Tx, categoryId, userId int) error {
	query := "delete from categories where id = ? and user_id = ?"
	_, err := tx.ExecContext(ctx, query, categoryId, userId)

	if err != nil {
		return fmt.Errorf("failed to delete category (id=%d, userId=%d): %w", categoryId, userId, err)
	}

	return nil
}

func (categoryRepository *CategoryRepositoryImpl) FindCategoryById(ctx context.Context, tx *sql.Tx, categoryId, userId int) (*domain.Category, error) {
	query := "select id,name from categories where id = ? and user_id = ?"
	row := tx.QueryRowContext(ctx, query, categoryId, userId)

	category := domain.Category{}
	err := row.Scan(&category.Id, &category.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("category not found (id=%d, userId=%d): %w", categoryId, userId, err)
		}
		return nil, fmt.Errorf("failed to scan category (id=%d, userId=%d): %w", categoryId, userId, err)
	}

	return &category, nil
}

func (categoryRepository *CategoryRepositoryImpl) FindAllCategory(ctx context.Context, tx *sql.Tx, userId int) ([]domain.Category, error) {
	query := "select id,name from categories where user_id = ?"
	rows, err := tx.QueryContext(ctx, query, userId)

	if err != nil {
		return nil, fmt.Errorf("failed to query categories for userId=%d: %w", userId, err)
	}
	defer rows.Close()

	categories := []domain.Category{}
	for rows.Next() {
		category := domain.Category{}
		if err := rows.Scan(&category.Id, &category.Name); err != nil {
			return nil, fmt.Errorf("failed to scan category row for userId=%d: %w", userId, err)
		}
		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error for userId=%d: %w", userId, err)
	}

	return categories, nil
}
