package web

import "github.com/ryhnfhrza/Expense-Tracker/internal/types"

type ExpenseCreateRequest struct {
	CategoryId  int               `json:"category_id" validate:"required,gt=0"`
	Description string            `json:"description"`
	Amount      float64           `json:"amount" validate:"required"`
	CreatedAt   *types.CustomTime `json:"created_at"`
	UserId      int               `json:"user_id" validate:"required,gt=0"`
}

type ExpenseUpdateRequest struct {
	Id          int               `json:"id" validate:"required,gt=0"`
	CategoryId  *int              `json:"category_id"`
	Description string            `json:"description" validate:"max=255"`
	Amount      *float64          `json:"amount"`
	CreatedAt   *types.CustomTime `json:"created_at"`
	UserId      int               `json:"user_id" validate:"required,gt=0"`
}
