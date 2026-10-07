export type AdminSession = {admin: {id: number; username: string}; csrfToken: string};
export type AdminOverview = {learnersTotal:number;uniquePhoneUsers:number;webOnlyPhoneUsers:number;coursesTotal:number;sectionsTotal:number;lessonsTotal:number};
export type Learner = {telegramUserId:string;username:string|null;firstName:string|null;lastName:string|null;languageCode:string|null;createdAt:string;lastSeenAt:string;startedLessons?:number;completedLessons?:number;watchedPercent?:number;contacted?:boolean;catalogAccess?:boolean;catalogExpiresAt?:string|null;botStartedAt?:string|null;miniAppOpenedAt?:string|null};
export type LearnerDirectory = {items:Learner[];total:number;limit:number;offset:number;hasMore:boolean};
export type RatingEntry = {rank:number;rankPool:number;learner:Learner;startedLessons:number;completedLessons:number;completionRate:number|null};
export type RatingDirectory = {items:RatingEntry[];total:number;limit:number;offset:number;hasMore:boolean;summary:{ranked:number;topCompleted:number;averageProgress:number|null}};
