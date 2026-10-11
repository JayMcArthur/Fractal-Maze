CC = gcc
CFLAGS = -O2 -Wall -Wextra
TARGET = repeated-maze
SRCS = main.c maze.c solver.c quizmaster.c
OBJS = $(SRCS:.c=.o)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: clean
