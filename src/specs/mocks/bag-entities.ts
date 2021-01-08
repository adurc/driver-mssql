import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AgencyAdurcModel } from './agency-adurc-model';
import { PostAdurcModel } from './post-adurc-model';
import { ProfileAdurcModel } from './profile-adurc-model';
import { UserAdurcModel } from './user-adurc-model';
import { UserAgencyAdurcModel } from './user-agency-adurc-model';

export const bagEntities: AdurcModel[] = [
    UserAdurcModel,
    UserAgencyAdurcModel,
    ProfileAdurcModel,
    PostAdurcModel,
    AgencyAdurcModel,
];