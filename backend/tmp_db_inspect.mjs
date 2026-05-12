import { Client } from "pg";
const client = new Client({ connectionString: 'postgresql://postgres:abe08@localhost:5432/clothcycle' });
try {
  await client.connect();
  const res = await client.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_name IN ('transactions','notifications','messages') ORDER BY table_name, ordinal_position");
  console.log(JSON.stringify(res.rows,null,2));
} catch (err) {
  console.error(err);
} finally {
  await client.end();
}
