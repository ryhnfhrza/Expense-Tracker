package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/internal/types"
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/repository"
)

type expenseServiceImpl struct {
	DB                      *sql.DB
	Validate                *validator.Validate
	ExpenseRepository       repository.ExpenseRepository
	CategoryRepository      repository.CategoryRepository
	ExspenseSummeryReposity repository.ExpenseSummaryRepository
}

func NewExpenseService(db *sql.DB, validate *validator.Validate, expenseRepository repository.ExpenseRepository, categoryRepository repository.CategoryRepository, exspenseSummeryReposity repository.ExpenseSummaryRepository) ExpenseService {
	return &expenseServiceImpl{
		DB:                      db,
		Validate:                validate,
		ExpenseRepository:       expenseRepository,
		CategoryRepository:      categoryRepository,
		ExspenseSummeryReposity: exspenseSummeryReposity,
	}
}

func (service *expenseServiceImpl) CreateExpense(ctx context.Context, request web.ExpenseCreateRequest) web.ExpenseResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	err = service.Validate.Struct(request)
	helper.PanicIfError(err)

	category, err := service.CategoryRepository.FindCategoryById(ctx, tx, request.CategoryId, request.UserId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("category with id:%d not found", request.CategoryId)))
	}

	if request.CreatedAt == nil || request.CreatedAt.Time.IsZero() {
		request.CreatedAt = &types.CustomTime{Time: time.Now().UTC()}
	}

	expense := domain.Expense{
		CategoryId:  request.CategoryId,
		Description: request.Description,
		Amount:      request.Amount,
		CreatedAt:   request.CreatedAt.Time,
		UserId:      request.UserId,
	}

	err = service.ExpenseRepository.CreateExpense(ctx, tx, &expense)
	helper.PanicIfError(err)

	return helper.ToExpenseResponse(expense, category.Name)
}

func (service *expenseServiceImpl) UpdateExpense(ctx context.Context, request web.ExpenseUpdateRequest) web.ExpenseResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	expense, err := service.ExpenseRepository.FindExpanseById(ctx, tx, request.Id, request.UserId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("expense with id:%d not found", request.Id)))
	}

	if request.CategoryId == nil {
		catID := expense.CategoryId
		request.CategoryId = &catID
	}

	if request.Description == "" {
		request.Description = expense.Description
	}

	if request.Amount == nil {
		request.Amount = &expense.Amount
	}

	if request.CreatedAt == nil {
		request.CreatedAt = &types.CustomTime{Time: expense.CreatedAt}
	} else if request.CreatedAt.Time.IsZero() {
		request.CreatedAt.Time = expense.CreatedAt
	}

	err = service.Validate.Struct(request)
	helper.PanicIfError(err)

	category, err := service.CategoryRepository.FindCategoryById(ctx, tx, *request.CategoryId, request.UserId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("category with id:%d not found", *request.CategoryId)))
	}

	expense.Id = request.Id
	expense.CategoryId = *request.CategoryId
	expense.Description = request.Description
	expense.Amount = *request.Amount
	expense.CreatedAt = request.CreatedAt.Time.UTC()
	expense.UserId = request.UserId

	expense, err = service.ExpenseRepository.UpdateExpense(ctx, tx, expense)
	helper.PanicIfError(err)

	return helper.ToExpenseResponse(*expense, category.Name)
}

func (service *expenseServiceImpl) DeleteExpense(ctx context.Context, expenseId, userId int) {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	_, err = service.ExpenseRepository.FindExpanseById(ctx, tx, expenseId, userId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("expense with id:%d not found", expenseId)))
	}

	err = service.ExpenseRepository.DeleteExpanse(ctx, tx, expenseId, userId)
	helper.PanicIfError(err)
}

func (service *expenseServiceImpl) FindExpenseById(ctx context.Context, expenseId, userId int) web.ExpenseResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	expense, err := service.ExpenseRepository.FindExpanseById(ctx, tx, expenseId, userId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("expense with id:%d not found", expenseId)))
	}

	category, err := service.CategoryRepository.FindCategoryById(ctx, tx, expense.CategoryId, userId)
	if err != nil {
		panic(exception.NewNotFoundError(fmt.Sprintf("category with id:%d not found", expense.CategoryId)))
	}

	return helper.ToExpenseResponse(*expense, category.Name)
}

func (service *expenseServiceImpl) FindAllExpense(ctx context.Context, userId int, filter domain.ExpenseFilter) []web.ExpenseResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	allowedSort := map[string]struct{}{
		"created_at":  {},
		"amount":      {},
		"description": {},
		"category_id": {},
		"id":          {},
	}

	if filter.SortBy == "" {
		filter.SortBy = "created_at"
	}
	if _, ok := allowedSort[filter.SortBy]; !ok {
		filter.SortBy = "created_at"
	}

	order := strings.ToUpper(filter.Order)
	if order != "ASC" && order != "DESC" {
		order = "DESC"
	}
	filter.Order = order

	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	expenses, err := service.ExpenseRepository.FindAllExpanse(ctx, tx, userId, filter)
	helper.PanicIfError(err)

	categories, err := service.CategoryRepository.FindAllCategory(ctx, tx, userId)
	helper.PanicIfError(err)

	return helper.ToExpenseResponses(expenses, categories)
}

func (service *expenseServiceImpl) GetSummaryDetails(ctx context.Context, userId int, filter domain.SummaryFilter) web.SummaryResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	summaries, err := service.ExspenseSummeryReposity.GetSummaryDetails(ctx, tx, userId, filter)
	helper.PanicIfError(err)

	var totalAll float64
	for _, s := range summaries {
		totalAll += s.Total
	}

	return helper.ToSummaryResult(totalAll, summaries)
}
