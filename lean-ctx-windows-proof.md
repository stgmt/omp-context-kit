# Проверка `lean-ctx` на Windows

## Результат

Windows-бинарник `lean-ctx` установлен и реально запускается.

Проверено:

- версия: `3.9.13`;
- платформа: `x86_64-pc-windows-msvc`;
- SHA-256 архива совпал с опубликованным upstream значением;
- чтение файла в режимах `signatures` и `map` работает;
- обработка shell-команды через `lean-ctx -c` работает;
- прямой OMP-адаптер upstream не предоставляет.

## Установка

Источник:

```text
https://github.com/yvgude/lean-ctx/releases/download/v3.9.13/lean-ctx-x86_64-pc-windows-msvc.zip
```

Опубликованный SHA-256:

```text
685766d595e023f411d3bbe0db36ab746ee3f04c38cb3ab045c663c4d5dfd39f
```

Полученный SHA-256 совпал.

Установленный файл:

```text
C:/Users/stigm/bin/lean-ctx.exe
```

Архив во временном каталоге:

```text
C:/Users/stigm/AppData/Local/lean-ctx-download/v3.9.13.zip
```

## Smoke-проверки

### Версия

```text
lean-ctx --version
exit: 0
lean-ctx 3.9.13 (official, https://github.com/yvgude/lean-ctx)
```

### Диагностика

После запуска `doctor --fix` бинарник создал каталог данных и обновил PowerShell-профиль.

Повторный `doctor` увидел бинарник и подтвердил:

- бинарник найден в PATH текущего процесса;
- версия определена как `3.9.13`;
- каталог данных существует;
- конфигурация CLI и MCP согласована;
- активен контроль пути проекта;
- включено скрытие секретов;
- доступно 223 команды в списке shell-разрешений.

`doctor` завершился с кодом `1`, потому что не настроены дополнительные интеграции:

- shell-алиасы не активны в текущем процессе без перезапуска PowerShell;
- не настроены некоторые режимы для VS Code и Claude Code;
- отсутствуют отдельные языковые серверы Rust, TypeScript и Python.

Это не отказ бинарника: сам бинарник найден, запускается и выполняет команды.

### Структурное чтение TypeScript

На временном TypeScript-файле:

```text
lean-ctx read .leanctx-smoke.ts -m signatures
exit: 0
fn async pub loadConfig(path:s) → Promise<string> @L3-5
fn pub summarize(value:s) → string @L7-9
```

Режим `map` также завершился с кодом `0` и вывел публичные функции.

Временный файл после проверки удалён.

### Shell-сжатие

```text
lean-ctx -c "echo line1 && echo line2 && echo line3"
exit: 0
line1
line2
line3
```

Команда прошла через Windows-бинарник и вернула корректный результат.

## Проверка интеграции с OMP

Прямого upstream-режима `omp` нет.

Команда `lean-ctx init --help` перечисляет `pi`, `codex`, `claude`, `cursor` и другие среды, но не `omp`.

Upstream-пакет `pi-lean-ctx` версии `3.10.1` содержит только поле:

```json
{
  "pi": {
    "extensions": ["./extensions/index.ts"]
  }
}
```

Его зависимости ожидают:

```text
@earendil-works/pi-coding-agent
@earendil-works/pi-tui
```

Текущий OMP использует:

```text
@oh-my-pi/pi-coding-agent
```

Поэтому `pi-lean-ctx` нельзя считать готовым OMP-расширением и нельзя объявлять прямую установку в OMP проверенной.

## Итоговое решение

Подтверждено:

> `lean-ctx` совместим с Windows как отдельный бинарник. Он установлен, запускается и прошёл чтение TypeScript и shell-smoke-тест.

Не подтверждено:

> Готовая интеграция `pi-lean-ctx` с OMP отсутствует. Для `omp-context-kit` нужен отдельный тонкий адаптер под OMP-контракты, а не слепая установка Pi-пакета.
