package web

import "time"

type ExpenseResponse struct {
	Id           int       `json:"id"`
	CategoryId   int       `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Description  string    `json:"description"`
	Amount       float64   `json:"amount"`
	CreatedAt    time.Time `json:"created_at"`
}
