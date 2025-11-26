export interface Tag {
  id: string;
  name: string;
  colorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTagDto {
  name: string;
  colorCode?: string;
}

export interface UpdateTagDto {
  name?: string;
  colorCode?: string;
}

// Simplified tag info returned in expense responses
export interface TagInfo {
  id: string;
  name: string;
  colorCode: string | null;
}
