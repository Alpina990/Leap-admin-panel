export type AdminSession = {admin: {id: number; username: string}; csrfToken: string};
export type AdminOverview = {learnersTotal:number;coursesTotal:number;sectionsTotal:number;lessonsTotal:number};
export type Learner = {telegramUserId:string;username:string|null;firstName:string|null;lastName:string|null;languageCode:string|null;createdAt:string;lastSeenAt:string};
export type LearnerDirectory = {items:Learner[];total:number;limit:number;offset:number;hasMore:boolean};
