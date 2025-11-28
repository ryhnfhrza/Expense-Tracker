package service

import (
	"context"

	"github.com/ryhnfhrza/Expense-Tracker/model/web"
)

type UserService interface {
	Register(ctx context.Context, req web.UserRequest) web.UserResponse
	VerifyEmail(ctx context.Context, email, code string) web.UserResponse
	Login(ctx context.Context, req web.UserLoginRequest) (web.UserLoginResponse, error)
}
