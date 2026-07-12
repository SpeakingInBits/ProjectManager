import type { Task } from '../models/types';
import { completeTask, uncompleteTask } from './repeat';

export async function toggleTaskCompletion(task: Task): Promise<void> {
  if (task.completed) {
    await uncompleteTask(task.id);
    return;
  }
  await completeTask(task.id);
}
