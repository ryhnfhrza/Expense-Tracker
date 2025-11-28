package service

import (
	"context"

	"github.com/ryhnfhrza/Expense-Tracker/model/web"
)

type CategoryService interface {
	CreateCategory(ctx context.Context, request *web.CategoryRequest) web.CategoryResponse
	DeleteCategory(ctx context.Context, categoryId, userId int)
	FindCategoryById(ctx context.Context, categoryId, userId int) web.CategoryResponse
	FindAllCategoryById(ctx context.Context, userId int) []web.CategoryResponse
}
