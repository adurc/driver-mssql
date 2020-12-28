import { MSSQLColumn } from '../interfaces/mssql-column';

export class CreateContextQueryBuilder {

    public pks: MSSQLColumn[];
    public rows: Record<string, unknown>[];

    constructor() {
        this.pks = [];
        this.rows = [];
    }

    public toSql(): string {
        return '';
    }

}