// utils/csv2json.js
const fs   = require('fs');
const path = require('path');
const csv  = require('csv-parser');

const inputFile  = path.resolve(__dirname, '..', 'scai_donation_google_data.csv');
const outputFile = path.resolve(__dirname, '..', 'scai_donation_google_data.json');

const results = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', row => {
    // 1. 清理 Time 字符串
    let rawTime = row.Time.trim().replace(/^"+|"+$/g, '');
    // 2. 尝试解析为 ISO，如果失败就保留原串
    let d = new Date(rawTime);
    let isoTime = !isNaN(d.getTime()) ? d.toISOString() : rawTime;

    results.push({
      Time:        isoTime,
      Sender:      row.Sender.trim(),
      Amount:      row.Amount.trim(),
      Source:      row.Source.trim(),
      Destination: row.Destination.trim(),
      Memo:        row.Memo.trim(),
      TxSignature: row['Tx Signature'].trim(),
      token:       (row.token || '').trim()
    });
  })
  .on('end', () => {
    // 写入 JSON 文件（缩进 2 格）
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`✅ 写入 ${outputFile} ，共 ${results.length} 条记录`);
  })
  .on('error', err => {
    console.error('❌ 处理 CSV 时出错：', err);
  });