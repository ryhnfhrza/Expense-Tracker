package service

import (
	"context"
	"database/sql"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/repository"
	"github.com/ryhnfhrza/Expense-Tracker/util"
)

type userServiceImpl struct {
	UserRepository      repository.UserRepository
	UserRedisRepository repository.UserRedisRepository
	Validate            *validator.Validate
	DB                  *sql.DB
}

func NewUserService(userRepository repository.UserRepository, userRedisRepository repository.UserRedisRepository, validate *validator.Validate, db *sql.DB) UserService {
	return &userServiceImpl{
		UserRepository:      userRepository,
		UserRedisRepository: userRedisRepository,
		Validate:            validate,
		DB:                  db,
	}
}

func (service *userServiceImpl) Register(ctx context.Context, req web.UserRequest) web.UserResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	err = service.Validate.Struct(req)
	helper.PanicIfError(err)

	_, err = service.UserRepository.FindByUsername(ctx, tx, req.Username)
	if err == nil {
		panic(exception.NewConflictError("username already exist!"))
	}
	_, err = service.UserRepository.FindByEmail(ctx, tx, req.Email)
	if err == nil {
		panic(exception.NewConflictError("email already exist!"))
	}

	passwordHash, err := util.HashPassword(req.Password)
	helper.PanicIfError(err)

	code, err := util.Generate6DigitCode()
	helper.PanicIfError(err)

	userTemp := domain.TempUser{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Code:         code,
	}

	_ = service.UserRedisRepository.DeleteTempUser(ctx, req.Email)

	err = service.UserRedisRepository.SaveTempUser(ctx, req.Email, 5*time.Minute, userTemp)
	helper.PanicIfError(err)

	go func() {
		err := helper.SendVerificationEmail(req.Email, code)
		helper.PanicIfError(err)
	}()

	return helper.ToUserResponse(domain.User{
		Username: req.Username,
		Email:    req.Email,
	})
}

func (service *userServiceImpl) VerifyEmail(ctx context.Context, email, code string) web.UserResponse {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	attempts, _ := service.UserRedisRepository.GetAttempts(ctx, email)
	if attempts >= 3 {
		panic(exception.NewTooManyRequestError("too many attempts, please wait 5 minutes"))
	}

	tempUser, err := service.UserRedisRepository.GetTempUser(ctx, email)
	if err != nil {
		panic(exception.NewNotFoundError("verification code expired or invalid. please request a new one"))
	}

	if tempUser.Code != code {
		_ = service.UserRedisRepository.IncrementAttempt(ctx, email, 5*time.Minute)
		panic(exception.NewUnauthorizedError("verification code is invalid"))
	}

	user := domain.User{
		Username:     tempUser.Username,
		PasswordHash: tempUser.PasswordHash,
		Email:        tempUser.Email,
	}
	err = service.UserRepository.SaveToDb(ctx, tx, &user)
	helper.PanicIfError(err)

	err = service.UserRedisRepository.DeleteTempUser(ctx, email)
	helper.PanicIfError(err)

	return helper.ToUserResponse(user)
}

func (service *userServiceImpl) Login(ctx context.Context, req web.UserLoginRequest) (web.UserLoginResponse, error) {
	tx, err := service.DB.Begin()
	helper.PanicIfError(err)
	defer helper.CommitOrRollback(tx)

	err = service.Validate.Struct(req)
	helper.PanicIfError(err)

	user, err := service.UserRepository.FindByUsername(ctx, tx, req.Username)
	if err != nil {
		panic(exception.NewUnauthorizedError("username or password invalid!"))
	}

	if !util.CheckPasswordHash(req.Password, user.PasswordHash) {
		panic(exception.NewUnauthorizedError("username or password invalid!"))
	}

	token, err := util.CreateToken(user)
	helper.PanicIfError(err)

	return helper.ToUserLoginResponse(*user, token), nil
}
