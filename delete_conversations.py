"""
刪除對話記錄工具
使用方法：
  python delete_conversations.py              # 顯示所有對話
  python delete_conversations.py --id 1       # 刪除指定ID的對話
  python delete_conversations.py --all        # 刪除所有對話（需要確認）
  python delete_conversations.py --user 123   # 刪除指定用戶的所有對話
"""

import sys
from app import create_app
from app.models import db, Conversation, Message, User

app = create_app()

def list_conversations():
    """顯示所有對話"""
    with app.app_context():
        convs = Conversation.query.all()
        print(f'\n📊 總共有 {len(convs)} 個對話\n')
        print(f'{"ID":<5} {"用戶":<15} {"標題":<30} {"訊息數":<10} {"創建時間":<20}')
        print('-' * 90)
        
        for c in convs:
            user = db.session.get(User, c.user_id)
            msg_count = Message.query.filter_by(conversation_id=c.id).count()
            print(f'{c.id:<5} {user.username if user else "未知":<15} {c.title[:28]:<30} {msg_count:<10} {c.created_at.strftime("%Y-%m-%d %H:%M"):<20}')
        print()

def delete_conversation_by_id(conv_id):
    """刪除指定ID的對話"""
    with app.app_context():
        conv = db.session.get(Conversation, conv_id)
        if not conv:
            print(f'❌ 對話 ID {conv_id} 不存在')
            return False
        
        user = db.session.get(User, conv.user_id)
        msg_count = Message.query.filter_by(conversation_id=conv.id).count()
        
        print(f'\n準備刪除對話：')
        print(f'  ID: {conv.id}')
        print(f'  用戶: {user.username if user else "未知"}')
        print(f'  標題: {conv.title}')
        print(f'  訊息數: {msg_count}')
        
        confirm = input('\n確定要刪除嗎？(yes/no): ')
        if confirm.lower() != 'yes':
            print('❌ 取消刪除')
            return False
        
        db.session.delete(conv)
        db.session.commit()
        print(f'✅ 成功刪除對話 ID {conv_id}')
        return True

def delete_all_conversations():
    """刪除所有對話"""
    with app.app_context():
        convs = Conversation.query.all()
        total = len(convs)
        
        if total == 0:
            print('📭 沒有對話可以刪除')
            return
        
        print(f'\n⚠️  警告：即將刪除所有 {total} 個對話！')
        confirm = input('請輸入 "DELETE ALL" 確認刪除: ')
        
        if confirm != 'DELETE ALL':
            print('❌ 取消刪除')
            return
        
        for conv in convs:
            db.session.delete(conv)
        
        db.session.commit()
        print(f'✅ 成功刪除所有 {total} 個對話')

def delete_user_conversations(username):
    """刪除指定用戶的所有對話"""
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f'❌ 用戶 {username} 不存在')
            return
        
        convs = Conversation.query.filter_by(user_id=user.id).all()
        total = len(convs)
        
        if total == 0:
            print(f'📭 用戶 {username} 沒有對話')
            return
        
        print(f'\n準備刪除用戶 {username} 的 {total} 個對話')
        confirm = input('確定要刪除嗎？(yes/no): ')
        
        if confirm.lower() != 'yes':
            print('❌ 取消刪除')
            return
        
        for conv in convs:
            db.session.delete(conv)
        
        db.session.commit()
        print(f'✅ 成功刪除用戶 {username} 的 {total} 個對話')

def main():
    if len(sys.argv) == 1:
        # 沒有參數，顯示所有對話
        list_conversations()
    elif '--id' in sys.argv:
        idx = sys.argv.index('--id')
        if idx + 1 < len(sys.argv):
            conv_id = int(sys.argv[idx + 1])
            delete_conversation_by_id(conv_id)
        else:
            print('❌ 請指定對話ID，例如：--id 1')
    elif '--all' in sys.argv:
        delete_all_conversations()
    elif '--user' in sys.argv:
        idx = sys.argv.index('--user')
        if idx + 1 < len(sys.argv):
            username = sys.argv[idx + 1]
            delete_user_conversations(username)
        else:
            print('❌ 請指定用戶名，例如：--user 123')
    else:
        print(__doc__)

if __name__ == '__main__':
    main()
