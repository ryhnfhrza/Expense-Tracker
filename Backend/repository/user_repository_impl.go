package repository

import (
	"context"
	"database/sql"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

type userRepositoryImpl struct{}

func NewUserRepository() UserRepository {
	return &userRepositoryImpl{}
}

func (userRepository *userRepositoryImpl) SaveToDb(ctx context.Context, tx *sql.Tx, user *domain.User) error {
	query := "insert into users(username,email,password_hash) values(?,?,?)"
	_, err := tx.ExecContext(ctx, query, user.Username, user.Email, user.PasswordHash)

	if err != nil {
		return err
	}

	return nil
}
func (userRepository *userRepositoryImpl) FindByUsername(ctx context.Context, tx *sql.Tx, username string) (*domain.User, error) {
	query := "select id,username,email,password_hash from users where username = ?"
	row := tx.QueryRowContext(ctx, query, username)

	user := &domain.User{}

	err := row.Scan(
		&user.Id,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
	)

	if err != nil {
		return nil, err
	}
	return user, nil
}
func (userRepository *userRepositoryImpl) FindByEmail(ctx context.Context, tx *sql.Tx, email string) (*domain.User, error) {
	query := "select id,username,email,password_hash from users where email = ?"
	row := tx.QueryRowContext(ctx, query, email)

	user := &domain.User{}

	err := row.Scan(
		&user.Id,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
	)

	if err != nil {
		return nil, err
	}
	return user, nil
}
