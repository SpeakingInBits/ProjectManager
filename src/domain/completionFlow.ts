import type { Task } from '../models/types';
import { completeTask, uncompleteTask } from './repeat';
import * as tasksRepo from '../db/tasks.repo';
import { promptTimeSpentHours } from '../components/timeSpentModal';

// A task with no time logged can't be completed silently — the user is
// prompted for how many hours they spent first, so the time-spent rollups
// stay meaningful. Cancelling the prompt leaves the task incomplete.
export async function toggleTaskCompletion(task: Task): Promise<void> {
  if (task.completed) {
    await uncompleteTask(task.id);
    return;
  }

  if (task.timeSpentHours === 0) {
    const hours = await promptTimeSpentHours(task.title);
    if (hours === null) return;
    await tasksRepo.update(task.id, { timeSpentHours: hours });
  }

  await completeTask(task.id);
}
