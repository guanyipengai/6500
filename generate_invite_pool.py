#!/usr/bin/env python
import random
import string

COUNT = 500
LENGTH = 8  # 每个初始邀请码长度为 8
ALPHABET = string.ascii_uppercase + string.digits  # 大写字母 + 数字


def gen_code() -> str:
  return "".join(random.choice(ALPHABET) for _ in range(LENGTH))


def main() -> None:
  random.seed()  # 使用系统熵源，避免可预测
  codes = set()
  while len(codes) < COUNT:
    codes.add(gen_code())

  print("code")  # CSV header
  for c in sorted(codes):
    print(c)


if __name__ == "__main__":
  main()

