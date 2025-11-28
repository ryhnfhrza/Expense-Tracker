package repository

import (
	"context"
	"database/sql"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type ExpenseSummaryRepository interface {
	GetSummaryDetails(ctx context.Context, tx *sql.Tx, userId int, filter domain.SummaryFilter) ([]domain.SummaryDetail, error)
}
