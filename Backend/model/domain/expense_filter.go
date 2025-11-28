package domain

import "time"

type ExpenseFilter struct {
	CategoryId    *int
	MinAmount     *float64
	MaxAmount     *float64
	CreatedBefore *time.Time
	CreatedAfter  *time.Time
	SortBy        string
	Limit         int
	Offset        int
	Order         string
	Description *string
}
