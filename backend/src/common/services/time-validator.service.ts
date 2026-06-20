import { Injectable, ForbiddenException } from '@nestjs/common';
import * as dayjs from 'dayjs';

@Injectable()
export class TimeValidatorService {
  validateUnsealTime(unsealTime: Date, currentTime?: Date): boolean {
    const now = currentTime || new Date();
    const canUnseal = dayjs(now).isAfter(dayjs(unsealTime));

    if (!canUnseal) {
      const diffMinutes = dayjs(unsealTime).diff(dayjs(now), 'minute');
      throw new ForbiddenException(
        `未到启封时间，请在 ${dayjs(unsealTime).format('YYYY-MM-DD HH:mm:ss')} 后启封，还需等待 ${Math.ceil(diffMinutes / 60)} 小时 ${diffMinutes % 60} 分钟`,
      );
    }
    return true;
  }

  isAfterUnsealTime(unsealTime: Date): boolean {
    return dayjs().isAfter(dayjs(unsealTime));
  }

  isWithinExamTime(startTime: Date, endTime: Date): boolean {
    const now = dayjs();
    return now.isAfter(dayjs(startTime)) && now.isBefore(dayjs(endTime));
  }

  formatTime(date: Date): string {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  }
}
