import axios from '../api/axiosDefault.js';

/**
 * После POST на AI-эндпоинт (202 + task_id) опрашивает GET /api/ai/tasks/:id/
 * до SUCCESS или ошибки.
 *
 * @param {string} taskId
 * @param {{ pollIntervalMs?: number, deadlineMs?: number }} [options]
 * @returns {Promise<object>} поле result из финального ответа (payload Celery)
 */
export async function pollAiTaskResult(taskId, options = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? 1500;
  const deadlineMs = options.deadlineMs ?? 320000;
  const start = Date.now();

  while (Date.now() - start < deadlineMs) {
    const res = await axios.get(
      `/api/ai/tasks/${encodeURIComponent(taskId)}/`,
      { validateStatus: () => true }
    );

    if (res.status === 403) {
      throw new Error(res.data?.detail || 'Нет доступа к задаче');
    }
    if (res.status === 500) {
      throw new Error(res.data?.detail || 'Задача завершилась с ошибкой');
    }
    if (res.status === 200 && res.data?.status === 'SUCCESS') {
      return res.data.result;
    }
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    throw new Error(
      res.data?.detail || `Неожиданный ответ сервера при опросе задачи (${res.status})`
    );
  }

  throw new Error('Превышено время ожидания ответа ИИ. Попробуйте позже.');
}
