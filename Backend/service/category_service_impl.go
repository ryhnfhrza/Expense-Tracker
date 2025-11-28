package service

import (
	"context"
	"database/sql"
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/repository"
)

type categoryServiceImpl struct {
	DB                 *sql.DB
	Validate           *validator.Validate
	CategoryRepository repository.CategoryRepository
}

func NewCategoryService(db *sql.DB, validate *validator.Validate, categoryRepository repository.CategoryRepository) CategoryService {
	return &categoryServiceImpl{
		DB:                 db,
		Validate:           validate,
		CategoryRepository: categoryRepository,
	}
}

func (categoryService *categoryServiceImpl) CreateCategory(ctx context.Context, request *web.CategoryRequest) web.CategoryResponse {
	tx, err := categoryService.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	err = categoryService.Validate.Struct(request)
	helper.PanicIfError(err)

	category := domain.Category{
		Name:   request.Name,
		UserId: request.UserId,
	}

	err = categoryService.CategoryRepository.SaveCategory(ctx, tx, &category)
	helper.PanicIfError(err)

	return helper.ToCategoryResponse(category)
}

func (categoryService *categoryServiceImpl) DeleteCategory(ctx context.Context, categoryId, userId int) {
	tx, err := categoryService.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	_, err = categoryService.CategoryRepository.FindCategoryById(ctx, tx, categoryId, userId)
	if errors.Is(err, sql.ErrNoRows) {
		panic(exception.NewNotFoundError("category not found"))
	}
	helper.PanicIfError(err)

	err = categoryService.CategoryRepository.DeleteCategory(ctx, tx, categoryId, userId)
	helper.PanicIfError(err)
}

func (categoryService *categoryServiceImpl) FindCategoryById(ctx context.Context, categoryId, userId int) web.CategoryResponse {
	tx, err := categoryService.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	category, err := categoryService.CategoryRepository.FindCategoryById(ctx, tx, categoryId, userId)
	if errors.Is(err, sql.ErrNoRows) {
		panic(exception.NewNotFoundError("category not found"))
	}
	helper.PanicIfError(err)

	return helper.ToCategoryResponse(*category)
}

func (categoryService *categoryServiceImpl) FindAllCategoryById(ctx context.Context, userId int) []web.CategoryResponse {
	tx, err := categoryService.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	categories, err := categoryService.CategoryRepository.FindAllCategory(ctx, tx, userId)
	helper.PanicIfError(err)

	return helper.ToCategoryResponses(categories)
}
