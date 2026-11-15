import { getLeadScore } from './leadScore';

const CONTACT_TYPES = ['call', 'email', 'sms', 'meeting'];
const ALIASES: Record<string, string> = { high: 'positive_interaction', medium: 'interested_need_time', low: 'busy_call_back' };

export function getLeadGuidance(lead: any, activities: any[] = []) {
  const features = lead?.aiAssessment?.features || {};
  const real = activities.filter(activity => CONTACT_TYPES.includes(activity.type));
  const latest = real.find(activity => activity.engagement_status);
  const raw = latest?.engagement_status || features.Last_Engagement_Status;
  const response = ALIASES[raw] || raw;
  const contacted = real.length > 0 || (typeof features.Has_Contact_Activity === 'boolean'
    ? features.Has_Contact_Activity
    : Boolean(lead?.last_contacted) || typeof features.Days_Since_Last_Activity === 'number');
  // Old or stale model scores must not drive registration advice.
  const score = lead?.aiAssessment?.model_status === 'scored' ? getLeadScore(lead) : null;
  const plan = (title: string, action: string, reason: string, question = '', closed = false) => ({ title, action, reason, question, closed });

  if (lead?.status === 'enrolled') return plan('Tiếp tục chăm sóc học viên', 'Theo dõi lịch học và hỗ trợ học viên bắt đầu khóa học.', 'Lead đã ở giai đoạn đăng ký.', '', true);
  if (lead?.status === 'lost') return plan('Đã kết thúc theo đuổi', 'Chỉ mở lại cơ hội khi khách có nhu cầu hoặc đồng ý liên hệ.', 'Lead đã được ghi nhận thất bại.', '', true);
  if (!contacted) return plan('Xác minh nhu cầu trước', 'Liên hệ lần đầu để xác nhận mục tiêu, thời gian học và khóa phù hợp.',
    ['interested', 'trial'].includes(lead?.status) ? 'Lead đã chuyển giai đoạn nhưng chưa có liên hệ được ghi nhận.' : 'Chưa có lần liên hệ được ghi nhận; điểm cao chưa thể hiện ý định đăng ký.',
    'Anh/chị muốn học để đạt mục tiêu gì và dự kiến bắt đầu khi nào?');
  if (response === 'wrong_number') return plan('Xác minh thông tin liên hệ', 'Kiểm tra lại số điện thoại hoặc dùng email/kênh liên hệ đã có.', 'Lần liên hệ được ghi nhận là sai số.');
  if (response === 'rejected') return plan('Làm rõ lý do từ chối', 'Ghi nhận lý do; chỉ tiếp tục khi khách đồng ý. Có thể đánh dấu thất bại nếu không còn nhu cầu.',
    'Khách đã từ chối; điểm AI không thay thế quyết định của khách.', 'Anh/chị chưa có nhu cầu lúc này hay khóa học hiện tại chưa phù hợp?');
  if (response === 'busy_call_back') return plan('Liên hệ lại theo lịch hẹn', 'Kiểm tra ghi chú và gọi lại vào thời gian đã thống nhất.', 'Khách đã hẹn trao đổi sau.', 'Khung giờ nào thuận tiện để em tư vấn thêm cho anh/chị?');
  if (response === 'not_answering') return plan(Number(features.Call_Attempt_Count) >= 3 ? 'Đổi giờ hoặc kênh liên hệ' : 'Thử liên hệ lại',
    'Chọn giờ khác hoặc gửi tin nhắn ngắn trước khi gọi; giảm tần suất nếu chưa kết nối.', 'Chưa nghe máy không đồng nghĩa không có nhu cầu.',
    'Em liên hệ về khóa học anh/chị quan tâm. Anh/chị tiện trao đổi vào lúc nào?');
  if (response === 'positive_interaction' && score !== null && score >= 80) return plan('Hỗ trợ khách đi đến đăng ký',
    'Xác nhận khóa học, học phí, lịch khai giảng và giải đáp điều còn phân vân trước khi hướng dẫn đăng ký.', 'Có phản hồi tích cực và điểm tham khảo cao.',
    'Anh/chị còn cần làm rõ điều gì để quyết định đăng ký khóa học?');
  if (lead?.status === 'trial') return plan('Theo sát bước học thử', 'Xác nhận lịch hoặc kết quả học thử, hỏi mức độ phù hợp trước khi đề nghị đăng ký.',
    'Lead đang ở giai đoạn học thử.', 'Nội dung và cách học có phù hợp với mục tiêu của anh/chị không?');
  if (score !== null && score < 50) return plan('Tìm hiểu điều còn vướng', 'Hỏi về học phí, thời gian và mục tiêu; đề xuất phương án phù hợp rồi ghi lại kết quả.',
    'Điểm tham khảo thấp; chưa đủ căn cứ để bỏ lead.', 'Điều gì khiến anh/chị chưa sẵn sàng bắt đầu: thời gian, học phí hay nội dung khóa học?');
  if (!response || response === 'unknown') return plan('Bổ sung kết quả liên hệ', 'Ghi lại phản hồi thực tế và bước tiếp theo đã thống nhất với khách.',
    'Đã có liên hệ nhưng chưa có kết quả rõ ràng.', 'Sau khi xem thông tin khóa học, anh/chị đang cân nhắc điều gì?');
  return plan('Làm rõ bước tiếp theo', 'Gửi thông tin đúng nhu cầu và thống nhất lịch tư vấn hoặc học thử.', 'Tiếp tục dựa vào phản hồi của khách để tư vấn.',
    'Anh/chị muốn tìm hiểu thêm nội dung học, học phí hay lịch học?');
}
