import os

if not os.path.exists("vishal"):
    os.mkdir("vishal")

n=1

while os.path.exists(f"vishal/ujwal_{n}"):
    n=n+1

os.mkdir(f"vishal/ujwal_{n}")

