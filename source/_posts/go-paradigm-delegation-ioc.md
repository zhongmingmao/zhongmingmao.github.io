---
title: Go Paradigm - Delegation + IoC
mathjax: false
date: 2022-01-28 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/go-ioc.svg
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 嵌入委托

```go
package main

type Widget struct {
	X, Y int
}

type Label struct {
	Widget        // type embedding - delegation
	Text   string // aggregation
}

type Button struct {
	Label // type embedding - delegation
}

type ListBox struct {
	Widget          // type embedding - delegation
	Texts  []string // aggregation
	Index  int      // aggregation
}

func main() {
	label := Label{Widget{10, 10}, "State:"}

	label.X = 11
	label.Y = 12
}
```

<!-- more -->

# 方法重写

```go
type Painter interface {
	Paint()
}

type Clicker interface {
	Click()
}

func (label Label) Paint() {
	fmt.Printf("%p:Label.Paint(%q)\n", &label, label.Text)
}

func (button Button) Paint() { // Override
	fmt.Printf("Button.Paint(%s)\n", button.Text)
}
func (button Button) Click() {
	fmt.Printf("Button.Click(%s)\n", button.Text)
}

func (listBox ListBox) Paint() {
	fmt.Printf("ListBox.Paint(%q)\n", listBox.Texts)
}
func (listBox ListBox) Click() {
	fmt.Printf("ListBox.Click(%q)\n", listBox.Texts)
}

func main() {
	var painter Painter = Button{Label{Widget{10, 70}, "ok"}}
	painter.Paint() // Button.Paint("ok")
}
```

# 多态

```go
b1 := Button{Label{Widget{10, 70}, "OK"}}
b2 := Button{Label{Widget{10, 40}, "Cancel"}}
listBox := ListBox{Widget{10, 40},
  []string{"AL", "AK", "AZ", "AR"}, 0}
label := Label{Text: "aa"}

for _, painter := range []Painter{label, listBox, b1, b2} {
  painter.Paint()
}

for _, widget := range []interface{}{label, listBox, b1, b2} {
  widget.(Painter).Paint()                 // type assertion
  if clicker, ok := widget.(Clicker); ok { // type assertion
    clicker.Click()
  }
  fmt.Println()
}
```

# 控制反转

> 将控制逻辑和业务逻辑分开，让`业务逻辑`依赖于`控制逻辑`，要`依赖抽象`，而非依赖具体

```go
type IntSet struct {
	data map[int]bool
}

func NewIntSet() IntSet {
	return IntSet{make(map[int]bool)}
}

func (set *IntSet) Add(x int) {
	set.data[x] = true
}

func (set *IntSet) Delete(x int) {
	delete(set.data, x)
}

func (set *IntSet) Contains(x int) bool {
	return set.data[x]
}
```

> 基于 IntSet 实现 Undo 功能，Undo 本身为`控制逻辑`，与 IntSet `强耦合`，不利于`复用`

```go
type UndoableIntSet struct { // poor style
	IntSet    // type embedding - delegation
	functions []func()
}

func NewUndoableIntSet() UndoableIntSet {
	return UndoableIntSet{NewIntSet(), nil}
}

func (set *UndoableIntSet) Add(x int) { // Override
	if !set.Contains(x) {
		set.data[x] = true
		set.functions = append(set.functions, func() { set.Delete(x) })
	} else {
		set.functions = append(set.functions, nil)
	}
}

func (set *UndoableIntSet) Delete(x int) { // Override
	if set.Contains(x) {
		delete(set.data, x)
		set.functions = append(set.functions, func() { set.Add(x) })
	} else {
		set.functions = append(set.functions, nil)
	}
}

func (set *UndoableIntSet) Undo() error {
	if len(set.functions) == 0 {
		return errors.New("no functions to undo")
	}
	index := len(set.functions) - 1
	if function := set.functions[index]; function != nil {
		function()
		set.functions[index] = nil // for garbage collection
	}
	set.functions = set.functions[:index]
	return nil
}
```

> `反转依赖` - 业务逻辑依赖控制逻辑

```go
type Undo []func()

func (undo *Undo) Add(function func()) {
	*undo = append(*undo, function)
}

func (undo *Undo) Undo() error {
	functions := *undo
	if len(functions) == 0 {
		return errors.New("no functions to undo")
	}
	index := len(functions) - 1
	if function := functions[index]; function != nil {
		function()
		functions[index] = nil // for garbage collection
	}
	*undo = functions[:index]
	return nil
}

type IntSet struct {
	data map[int]bool
	undo Undo // 让业务逻辑依赖控制逻辑（依赖抽象，依赖接口）
}

func NewIntSet() IntSet {
	return IntSet{data: make(map[int]bool)}
}

func (set *IntSet) Undo() error {
	return set.undo.Undo()
}

func (set *IntSet) Contains(x int) bool {
	return set.data[x]
}

func (set *IntSet) Add(x int) {
	if !set.Contains(x) {
		set.data[x] = true
		set.undo.Add(func() { set.Delete(x) })
	} else {
		set.undo.Add(nil)
	}
}

func (set *IntSet) Delete(x int) {
	if set.Contains(x) {
		delete(set.data, x)
		set.undo.Add(func() { set.Add(x) })
	} else {
		set.undo.Add(nil)
	}
}
```



