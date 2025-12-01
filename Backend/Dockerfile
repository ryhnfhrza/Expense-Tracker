FROM golang:1.25 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Cross-compile static Linux binary
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64
RUN go build -ldflags="-s -w" -o main .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /app/main .
COPY --from=builder /app/templates ./templates

RUN adduser -D appuser
USER appuser

EXPOSE 8080

CMD ["./main"]