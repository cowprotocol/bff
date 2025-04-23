import { createNewPostgresOrm } from './postgresOrm';

const dataSource = createNewPostgresOrm();
dataSource.initialize();

export default dataSource;
