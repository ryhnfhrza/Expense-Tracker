package service

import (
	"context"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
)

type ExpenseService interface {
	CreateExpense(ctx context.Context, request web.ExpenseCreateRequest) web.ExpenseResponse
	UpdateExpense(ctx context.Context, request web.ExpenseUpdateRequest) web.ExpenseResponse
	DeleteExpense(ctx context.Context, expenseId, userId int)
	FindExpenseById(ctx context.Context, expenseId, userId int) web.ExpenseResponse
	FindAllExpense(ctx context.Context, userId int, filter domain.ExpenseFilter) []web.ExpenseResponse
	GetSummaryDetails(ctx context.Context, userId int, filter domain.SummaryFilter) web.SummaryResponse
}
