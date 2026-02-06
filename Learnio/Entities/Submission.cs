using System.ComponentModel.DataAnnotations.Schema;

namespace Learnio.Entities
{
    public class Submission
    {
        public Guid Id { get; set; }
        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;
        public string? TextAnswer { get; set; }
        public string? FilePath { get; set; }

        // Тичер 
        public int? Grade { get; set; } // Оценка (может быть null)
        public string? TeacherComments { get; set; } // Твоё поле

        // --- МНЕНИЕ AI (ДЛЯ УЧИТЕЛЯ) ---
        public int? AiRecommendedGrade { get; set; } // <--- Новое поле
        public string? AiFeedback { get; set; }      // <--- Новое поле

        // Связь: Студент
        public string StudentId { get; set; }
        [ForeignKey("StudentId")]
        public AppUser Student { get; set; }

        // Связь: Задание
        public Guid AssignmentId { get; set; }
        [ForeignKey("AssignmentId")]
        public Assignment Assignment { get; set; }
    }
}
