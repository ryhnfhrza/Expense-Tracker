package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type expenseSummeryImpl struct {
}

func NewExpenseSummeryRepository() ExpenseSummaryRepository {
	return &expenseSummeryImpl{}
}

func (repository *expenseSummeryImpl) GetSummaryDetails(ctx context.Context, tx *sql.Tx, userId int, filter domain.SummaryFilter) ([]domain.SummaryDetail, error) {
	query := `
        SELECT 
            e.category_id,
            c.name AS category_name,
            e.description,
            e.amount,
            e.created_at
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        WHERE e.user_id = ?
    `

	args := []interface{}{userId}

	if filter.CategoryId != nil {
		query += " AND e.category_id = ?"
		args = append(args, *filter.CategoryId)
	}
	if filter.Day != nil {
		query += " AND DAY(e.created_at) = ?"
		args = append(args, *filter.Day)
	}
	if filter.Month != nil {
		query += " AND MONTH(e.created_at) = ?"
		args = append(args, *filter.Month)
	}
	if filter.Year != nil {
		query += " AND YEAR(e.created_at) = ?"
		args = append(args, *filter.Year)
	}
	if filter.Description != nil {
		query += " AND e.description LIKE ?"
		args = append(args, "%"+*filter.Description+"%")
	}

	query += " ORDER BY e.category_id, e.created_at ASC"

	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaryMap := make(map[int]*domain.SummaryDetail)

	for rows.Next() {
		var (
			categoryId   int
			categoryName string
			description  sql.NullString
			amount       float64
			createdAt    time.Time
		)

		if err := rows.Scan(&categoryId, &categoryName, &description, &amount, &createdAt); err != nil {
			return nil, err
		}

		if _, ok := summaryMap[categoryId]; !ok {
			summaryMap[categoryId] = &domain.SummaryDetail{
				CategoryName: categoryName,
				Records:      []domain.ExpenseRecord{},
				Total:        0,
			}
		}

		record := domain.ExpenseRecord{
			Amount:      amount,
			Date:        createdAt.Format("2006-01-02"),
			Description: "",
		}
		if description.Valid {
			record.Description = description.String
		}

		summaryMap[categoryId].Records = append(summaryMap[categoryId].Records, record)
		summaryMap[categoryId].Total += amount
	}

	result := make([]domain.SummaryDetail, 0, len(summaryMap))
	for _, v := range summaryMap {
		result = append(result, *v)
	}

	return result, nil
}
