import { AdurcField } from '@adurc/core/dist/interfaces/model';

export interface MSSQLColumn {
    info: AdurcField;
    columnName: string;
    columnType: string;
    primary: boolean;
    identity: boolean;
    computed: boolean;
}