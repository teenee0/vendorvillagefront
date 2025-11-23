# Страница задач (TasksPage)

## Описание
Страница для управления задачами бизнеса. Позволяет создавать, редактировать, удалять задачи, назначать ответственных, привязывать к локациям и создавать подзадачи.

## Маршрут
`/business/:business_slug/tasks`

## Функционал

### Основные возможности:
- ✅ Создание задач с названием, описанием, важностью, статусом
- ✅ Назначение ответственных (работников бизнеса)
- ✅ Привязка к локациям
- ✅ Создание подзадач
- ✅ Загрузка файлов к задачам
- ✅ Фильтрация по статусу, важности, локации
- ✅ Поиск по названию и описанию
- ✅ Отображение подзадач

### Поля задачи:
- **Название** (обязательное)
- **Описание** (опционально)
- **Важность**: Низкая, Средняя, Высокая, Критическая
- **Статус**: К выполнению, В работе, На проверке, Выполнена, Отменена
- **Срок выполнения** (опционально)
- **Локация** (опционально)
- **Родительская задача** (для создания подзадач)
- **Ответственные** (множественный выбор работников)
- **Файлы** (можно загружать несколько файлов)

## API Endpoints

### GET `/api/business/:business_slug/tasks/`
Получение списка задач с фильтрацией и пагинацией.

**Параметры запроса:**
- `status` - фильтр по статусу
- `priority` - фильтр по важности
- `location` - фильтр по локации
- `assignee` - фильтр по ответственному
- `search` - поиск по названию/описанию
- `parent_task` - фильтр по родительской задаче
- `show_subtasks` - показывать подзадачи (true/false)
- `page` - номер страницы
- `page_size` - размер страницы
- `sort` - сортировка (по умолчанию: `-created_at`)

### POST `/api/business/:business_slug/tasks/`
Создание новой задачи.

**Тело запроса:**
```json
{
  "title": "Название задачи",
  "description": "Описание",
  "priority": "medium",
  "status": "todo",
  "due_date": "2025-12-31T23:59:59Z",
  "location": 1,
  "parent_task": null,
  "assignee_ids": [1, 2, 3]
}
```

### GET `/api/business/:business_slug/tasks/:task_id/`
Получение детальной информации о задаче.

### PATCH `/api/business/:business_slug/tasks/:task_id/`
Обновление задачи.

### DELETE `/api/business/:business_slug/tasks/:task_id/`
Удаление задачи.

### POST `/api/business/:business_slug/tasks/:task_id/files/`
Загрузка файла к задаче.

**Форма данных:**
- `file` - файл
- `name` - название файла

### DELETE `/api/business/:business_slug/tasks/:task_id/files/:file_id/`
Удаление файла из задачи.

## Модели БД

### Task
- `business` - ForeignKey к Business
- `parent_task` - ForeignKey к Task (для подзадач)
- `location` - ForeignKey к BusinessLocation (опционально)
- `created_by` - ForeignKey к User
- `assignees` - ManyToMany к User
- `title` - CharField
- `description` - TextField
- `priority` - CharField (low, medium, high, critical)
- `status` - CharField (todo, in_progress, review, done, cancelled)
- `due_date` - DateTimeField (опционально)
- `created_at` - DateTimeField
- `updated_at` - DateTimeField
- `completed_at` - DateTimeField (опционально)

### TaskFile
- `task` - ForeignKey к Task
- `file` - FileField
- `name` - CharField
- `uploaded_by` - ForeignKey к User
- `uploaded_at` - DateTimeField

## Навигация
Ссылка на страницу задач добавлена в `BusinessFooter` с иконкой ✅ и меткой "Задачи".

