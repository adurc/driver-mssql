import { AdurcField } from '@adurc/core/dist/interfaces/model';
import { ISqlType, IColumnOptions } from 'mssql';

export interface MSSQLColumn {
    info: AdurcField;
    columnName: string;
    sqlType: ISqlType;
    options: IColumnOptions;
}