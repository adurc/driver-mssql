import { AdurcField, AdurcModel } from '@adurc/core/dist/interfaces/model';
import { ProjectionInfoMeta } from '@adurc/core/dist/interfaces/projection';
import sql from 'mssql';

export const ColumnDataTypeOptions = ['tinyint', 'smallint', 'int', 'bigint', 'decimal', 'uniqueidentifier', 'varchar', 'char', 'datetime', 'varbinary'];
export type ColumnDataType = 'tinyint' | 'smallint' | 'int' | 'bigint' | 'decimal' | 'uniqueidentifier' | 'varchar' | 'char' | 'datetime' | 'varbinary';

export interface ISqlDriverOptions {
    config: sql.config;
    useHintsNoLocks?: boolean;
}

export interface IRelationProjection {
    relation: SQLRelation;
    projection: ProjectionInfoMeta;
}

export interface SQLColumn {
    info: AdurcField;
    name: string;
    type: ColumnDataType;
    isPrimary: boolean;
}

export interface SQLRelationInfo {
    model: AdurcModel;
    field: AdurcField;
}

export interface SQLRelation {
    field: AdurcField;
    source: SQLRelationInfo;
    dest: SQLRelationInfo;
    nonNull: boolean;
}

export interface SQLEntity {
    info: AdurcModel;
    schema?: string;
    name: string;
    columns: SQLColumn[];
    manyToOnes: SQLRelation[];
    oneToManies: SQLRelation[];
}
