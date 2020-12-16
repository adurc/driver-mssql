import { AdurcField } from '@adurc/core/dist/interfaces/model';
import { MSSQLEntity } from './mssql-entity';

export type MSSQLRelationManyToOne = {
    info: AdurcField;
    type: 'manyToOne';
    joinEntity: MSSQLEntity;
    joinColumn: string;
    inverseColumn: string;
}

export type MSSQLRelationOneToMany = {
    info: AdurcField;
    type: 'oneToMany';
    joinEntity: MSSQLEntity;
    joinColumn: string;
    inverseColumn: string;
}

export type MSSQLRelationManyToMany = {
    info: AdurcField;
    type: 'manyToMany';
    joinEntity: MSSQLEntity;
    joinColumn: string;
    inverseColumn: string;
    manyTableName: string;
    joinColumnReferencedColumnName: string;
    inverseColumnReferencedColumnName: string;
}

export type MSSQLRelation = MSSQLRelationManyToOne | MSSQLRelationOneToMany | MSSQLRelationManyToMany;