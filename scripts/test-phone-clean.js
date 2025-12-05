// テスト: cleanPhoneNumber関数の動作を確認（修正後）
function cleanPhoneNumber(phone) {
  const original = phone?.trim() || '';
  let cleaned = original;
  let movedToNotes;

  if (!original) {
    return { original, cleaned: '', isValid: true };
  }

  // 余分なテキストを抽出（修正版: 電話番号の後に数字・ハイフン以外の文字がある場合のみ）
  const phoneWithText = original.match(/^([\d\-\(\)\s]+)([^\d\-\(\)\s].*)$/);
  console.log('phoneWithText match:', phoneWithText);

  if (phoneWithText && phoneWithText[2].trim()) {
    cleaned = phoneWithText[1].trim();
    movedToNotes = phoneWithText[2].trim();
    console.log('Matched - cleaned:', cleaned, 'movedToNotes:', movedToNotes);
  }

  return { original, cleaned, movedToNotes };
}

console.log('=== 修正後のテスト ===');
console.log('\nTest 1: 045-713-2708 (正常な電話番号)');
console.log(cleanPhoneNumber('045-713-2708'));

console.log('\nTest 2: 090-1779-6603 (正常な携帯番号)');
console.log(cleanPhoneNumber('090-1779-6603'));

console.log('\nTest 3: 045-123-4567 自宅 (テキスト付き)');
console.log(cleanPhoneNumber('045-123-4567 自宅'));

console.log('\nTest 4: 03-1234-5678（会社） (括弧付きテキスト)');
console.log(cleanPhoneNumber('03-1234-5678（会社）'));
