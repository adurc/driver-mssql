import { AdurcContext } from '@adurc/core';
import { SQLEntity } from './interfaces';

export interface SQLContext {
    dataServerContext: AdurcContext;
    entities: SQLEntity[];
}