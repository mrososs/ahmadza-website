import type { UploadedVideoInfo } from '~/types/content'
import { isVideoPath } from '~/utils/video-upload'

const idPattern = /^[\w-]{11}$/

export interface VideoMetadata {
  youtubeId?: string
  /** Storage path of the uploaded file. Server and admin only; never part of the public content shape. */
  videoPath?: string
  uploadedVideo?: UploadedVideoInfo
  downloadAllowed: boolean
  durationSeconds?: number
}

/** Reads the video keys of `content_items.metadata`. Older rows only have `youtubeId`; unknown or malformed values are ignored. */
export function parseVideoMetadata(metadata: Record<string, unknown>): VideoMetadata {
  const youtubeId = typeof metadata.youtubeId === 'string' && idPattern.test(metadata.youtubeId) ? metadata.youtubeId : undefined
  const videoPath = isVideoPath(metadata.videoPath) ? metadata.videoPath : undefined
  const mimeType = typeof metadata.videoMimeType === 'string' ? metadata.videoMimeType : undefined
  const bytes = typeof metadata.videoBytes === 'number' ? metadata.videoBytes : undefined
  return {
    ...(youtubeId ? { youtubeId } : {}),
    ...(videoPath ? { videoPath, uploadedVideo: { mimeType: mimeType ?? 'video/mp4', ...(bytes === undefined ? {} : { bytes }) } } : {}),
    downloadAllowed: metadata.downloadAllowed === true,
    ...(typeof metadata.durationSeconds === 'number' ? { durationSeconds: metadata.durationSeconds } : {}),
  }
}
