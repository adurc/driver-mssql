import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../entity.converter';
import { RecordsetConverter } from '../recordset.converter';
import { SimpleAdurcModel } from './mocks/simple-adurc-model';
import mssql from 'mssql';
import { bagEntities } from './mocks/bag-entities';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';

describe('recordset converter tests', () => {
    it('simple recordset converter', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels(models);

        const args: AdurcFindManyArgs = {
            select: {
                id: true,
                name: true,
            }
        };

        const result: mssql.IResult<Record<string, unknown>> = {
            output: null as never,
            rowsAffected: [0],
            recordset: [] as never,
            recordsets: [
                [{ id: 1, name: 'fake' }] as never
            ],
        };

        const converted = RecordsetConverter.convertResult(entities[0], args, result);

        expect(converted).toEqual([
            { id: 1, name: 'fake' },
        ]);
    });

    it('recordset converter with join', () => {
        const entities = EntityConverter.fromModels(bagEntities);
        const userEntity = entities.find(x => x.info.name === 'User');

        const args: AdurcFindManyArgs = {
            select: {
                id: true,
                name: true,
            },
            include: {
                profile: {
                    bio: true,
                },
            }
        };

        const result: mssql.IResult<Record<string, unknown>> = {
            output: null as never,
            rowsAffected: [0],
            recordset: [] as never,
            recordsets: [
                [{ id: 1, name: 'fake', 'profile.bio': 'test' }] as never,
            ],
        };

        const converted = RecordsetConverter.convertResult(userEntity, args, result);

        expect(converted).toEqual([
            { id: 1, name: 'fake', profile: { bio: 'test' } },
        ]);
    });

    it('recordset converter with one to many', () => {
        const entities = EntityConverter.fromModels(bagEntities);
        const userEntity = entities.find(x => x.info.name === 'User');

        const args: AdurcFindManyArgs = {
            select: {
                id: true,
                name: true,
            },
            include: {
                posts: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            }
        };

        const result: mssql.IResult<Record<string, unknown>> = {
            output: null as never,
            rowsAffected: [0],
            recordset: [] as never,
            recordsets: [
                [
                    { '__id': 1, id: 1, name: 'fake 1' },
                    { '__id': 2, id: 2, name: 'fake 2' },
                ] as never,
                [
                    { '__parent_id': 1, id: 1, title: 'post title from fake 1' },
                    { '__parent_id': 2, id: 2, title: 'post title from fake 2' },
                ] as never,
            ],
        };

        const converted = RecordsetConverter.convertResult(userEntity, args, result);

        expect(converted).toEqual([
            { id: 1, name: 'fake 1', posts: [{ id: 1, title: 'post title from fake 1' }] },
            { id: 2, name: 'fake 2', posts: [{ id: 2, title: 'post title from fake 2' }] },
        ]);
    });

    it('recordset converter with many to many', () => {
        const entities = EntityConverter.fromModels(bagEntities);
        const userEntity = entities.find(x => x.info.name === 'User');

        const args: AdurcFindManyArgs = {
            select: {
                id: true,
                name: true,
            },
            include: {
                agencies: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        };

        const result: mssql.IResult<Record<string, unknown>> = {
            output: null as never,
            rowsAffected: [0],
            recordset: [] as never,
            recordsets: [
                [
                    { '__id': 1, id: 1, name: 'fake 1' },
                    { '__id': 2, id: 2, name: 'fake 2' },
                ] as never,
                [
                    { '__parent_id': 1, id: 1, name: 'Agency 1' },
                    { '__parent_id': 2, id: 1, name: 'Agency 1' },
                ] as never,
            ],
        };

        const converted = RecordsetConverter.convertResult(userEntity, args, result);

        expect(converted).toEqual([
            { id: 1, name: 'fake 1', agencies: [{ id: 1, name: 'Agency 1' }] },
            { id: 2, name: 'fake 2', agencies: [{ id: 1, name: 'Agency 1' }] },
        ]);
    });
});
