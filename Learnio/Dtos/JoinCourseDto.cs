using System.ComponentModel.DataAnnotations;

namespace Learnio.Dtos
{
    public class JoinCourseDto
    {
        [Required]
        public string JoinCode { get; set; } // Код, который дал учитель (напр. XY12A)

        [Required]
        public string StudentEmail { get; set; } // ВРЕМЕННО: Чтобы мы знали, кого записывать
    }
}