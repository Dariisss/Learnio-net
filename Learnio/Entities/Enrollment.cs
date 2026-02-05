using System.ComponentModel.DataAnnotations.Schema;

namespace Learnio.Entities
{
    public class Enrollment
    {
        public Guid Id { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Связь: Студент
        public string StudentId { get; set; }
        [ForeignKey("StudentId")]
        public AppUser Student { get; set; }

        // Связь: Курс
        public Guid CourseId { get; set; }
        [ForeignKey("CourseId")]
        public Course Course { get; set; }
    }
}
