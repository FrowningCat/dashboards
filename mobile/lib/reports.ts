import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { API_BASE_URL, ApiError } from '@/lib/api';

/**
 * Скачивание финансового отчёта.
 *
 * Отчёт остался единственным, что отсюда выгружается файлом: поставки и
 * остатки стали экранами. Периода у него нет — Wildberries закрывает отчёт
 * раз в неделю, и скачивается всегда последняя закрытая.
 *
 * Сохранение устроено по-разному на вебе и на телефоне, и обойтись одним
 * способом нельзя. В браузере файл кладётся по ссылке с download — это и
 * есть привычная «загрузка». На телефоне такой папки, куда пользователь
 * потом сам зайдёт, попросту нет: файл пишется во временную и сразу
 * отдаётся в системное «Поделиться», откуда его сохраняют в «Файлы»,
 * почту или мессенджер.
 */

// Отчёт собирается на стороне Wildberries дольше обычного запроса, поэтому
// предел выше, чем у входа: там десять секунд, здесь минута.
const TIMEOUT_MS = 60_000;

/** Дата в том виде, в каком её понимает FastAPI. */
function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Имя файла задаёт сервер: он знает, за какую неделю собрал отчёт. Заголовок
 * может не дойти (браузер прячет его без expose_headers на той стороне),
 * поэтому запасное имя собирается здесь.
 */
function filenameFrom(response: Response, fallback: string): string {
  const header = response.headers.get('Content-Disposition');
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
}

async function save(filename: string, body: ArrayBuffer): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Временная папка, а не документы: файл нужен ровно до того момента, как
  // его примет системное «Поделиться». Оставлять копию в документах значит
  // копить отчёты, которые никто не удалит.
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(new Uint8Array(body));

  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('cannotSave');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: filename,
    UTI: 'public.comma-separated-values-text',
  });
}

/**
 * Скачивает финансовый отчёт за неделю и отдаёт имя сохранённого файла.
 *
 * Байты берутся целиком, а не текстом: response.text() съедает BOM в начале
 * файла, а без него Excel на Windows открывает кириллицу кракозябрами.
 */
export async function downloadFinanceReport(weekStart: Date): Promise<string> {
  if (API_BASE_URL === null) {
    throw new ApiError('notConfigured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/reports/finance?week=${iso(weekStart)}`, {
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('unreachable');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 501) {
    throw new ApiError('notImplemented');
  }

  if (response.status === 409) {
    throw new ApiError('noData');
  }

  if (!response.ok) {
    throw new ApiError('serverError', String(response.status));
  }

  const body = await response.arrayBuffer();
  const filename = filenameFrom(response, `finansovyy-otchet-${iso(weekStart)}.csv`);
  await save(filename, body);

  return filename;
}
