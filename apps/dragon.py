
def is_sorted(lst):
    for i in range(len(lst) - 1):
        if lst[i] > lst[i + 1]:
            return False
    return True

def bubble_sort(lst):
    n = len(lst)
    for i in range(n):
        for j in range(n - 1 - i):
            if lst[j] > lst[j+1]:
                lst[j] , lst[j+1] = lst[j+1], lst[j]
    return lst
my_list = [5, 2, 8, 1, 9, 3]
print("Original list, Is Sorted:", is_sorted(my_list))


lst = bubble_sort(my_list)
print("sorted list, Is Sorted:", is_sorted(lst))
print(lst)
print("compare with built-in sorted function")
print(sorted([5, 2, 8, 1, 9, 3]))   


lst = bubble_sort([10, 7, 4, 2, 5])
print(lst)
print("compare with built-in sorted function")
print(sorted([10, 7, 4, 2, 5]))