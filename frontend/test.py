a = '1'
b = '2'
print(f"{b},", end='')  # 输出b的当前值
b = chr(ord(b) + 1)     # 模拟后缀自增运算符的效果，将b的ASCII值加1后转换回字符
print(f"{ord(b) - ord(a)}\n")  # 计算b和a的ASCII值之差并输出